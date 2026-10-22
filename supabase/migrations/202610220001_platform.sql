BEGIN;
CREATE TABLE public.stores (
 id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id), slug text NOT NULL UNIQUE,
 name text NOT NULL, settings text NOT NULL CHECK(jsonb_typeof(settings::jsonb)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stores_owner ON public.stores(owner_id);
CREATE TABLE public.products (
 id text PRIMARY KEY,store_id text NOT NULL REFERENCES public.stores(id),data text NOT NULL CHECK(jsonb_typeof(data::jsonb)='object'),
 price integer NOT NULL CHECK(price>0),stock integer NOT NULL CHECK(stock>=0),active integer NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 revision integer NOT NULL DEFAULT 1,stock_reason text NOT NULL DEFAULT 'Inventory adjustment',created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_store ON public.products(store_id);
CREATE TABLE public.requests (
 id text PRIMARY KEY,store_id text NOT NULL REFERENCES public.stores(id),kind text NOT NULL CHECK(kind IN('order','swap')),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN('submitted','reviewing','quoted','declined','completed')),
 data text NOT NULL CHECK(jsonb_typeof(data::jsonb)='object'),customer_id text,total bigint NOT NULL CHECK(total>=0),
 target_id text REFERENCES public.products(id),credit integer CHECK(credit>=0),quote_price integer CHECK(quote_price>0),
 seller_note text NOT NULL DEFAULT '',revision integer NOT NULL DEFAULT 1,created timestamptz NOT NULL DEFAULT now(),
 idempotency_key text NOT NULL,fingerprint text NOT NULL,UNIQUE(store_id,idempotency_key)
);
CREATE INDEX requests_store ON public.requests(store_id);
CREATE TABLE public.request_items (
 id text PRIMARY KEY,request_id text NOT NULL REFERENCES public.requests(id),product_id text NOT NULL REFERENCES public.products(id),
 quantity integer NOT NULL CHECK(quantity>0),price integer NOT NULL CHECK(price>0),data text NOT NULL
);
CREATE INDEX request_items_request ON public.request_items(request_id);
CREATE TABLE public.sales(id text PRIMARY KEY,store_id text NOT NULL REFERENCES public.stores(id),product_id text NOT NULL REFERENCES public.products(id),quantity integer NOT NULL CHECK(quantity>0),created timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.inventory_events(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,store_id text NOT NULL REFERENCES public.stores(id),product_id text NOT NULL REFERENCES public.products(id),delta integer NOT NULL,balance integer NOT NULL CHECK(balance>=0),reason text NOT NULL,created timestamptz NOT NULL DEFAULT now());
CREATE INDEX inventory_events_store ON public.inventory_events(store_id,created DESC);
CREATE TABLE public.rate_limits(key text PRIMARY KEY,count integer NOT NULL,expires bigint NOT NULL);

-- Business records are accessed exclusively by the server. Browser auth keys
-- cannot directly read or write these tables, including seller/customer data.
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stores,public.products,public.requests,public.request_items,public.sales,public.inventory_events,public.rate_limits FROM anon,authenticated;

CREATE FUNCTION public.log_product_stock() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.stock>0 THEN INSERT INTO public.inventory_events(store_id,product_id,delta,balance,reason) VALUES(NEW.store_id,NEW.id,NEW.stock,NEW.stock,'Initial stock'); END IF;
 ELSIF NEW.stock<>OLD.stock THEN
  INSERT INTO public.inventory_events(store_id,product_id,delta,balance,reason) VALUES(NEW.store_id,NEW.id,NEW.stock-OLD.stock,NEW.stock,NEW.stock_reason);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER log_product_stock AFTER INSERT OR UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_stock();

CREATE FUNCTION public.record_physical_sale() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE available integer;
BEGIN
 SELECT stock INTO available FROM public.products WHERE id=NEW.product_id AND store_id=NEW.store_id AND active=1 FOR UPDATE;
 IF available IS NULL OR available<NEW.quantity THEN RAISE EXCEPTION 'insufficient_stock'; END IF;
 UPDATE public.products SET stock=stock-NEW.quantity,revision=revision+1,stock_reason='Physical store sale '||NEW.id WHERE id=NEW.product_id AND store_id=NEW.store_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER physical_sale BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.record_physical_sale();

CREATE FUNCTION public.complete_request_stock() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status<>'completed' OR OLD.status='completed' THEN RETURN NEW; END IF;
 IF NEW.kind='order' THEN
  IF OLD.status NOT IN('submitted','reviewing') OR NOT EXISTS(SELECT 1 FROM public.request_items WHERE request_id=NEW.id) THEN RAISE EXCEPTION 'invalid_order_transition'; END IF;
  -- Lock all affected products in a consistent order before validating any item.
  PERFORM p.id FROM public.products p WHERE p.id IN(SELECT product_id FROM public.request_items WHERE request_id=NEW.id) ORDER BY p.id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.request_items i LEFT JOIN public.products p ON p.id=i.product_id WHERE i.request_id=NEW.id AND (p.id IS NULL OR p.store_id<>NEW.store_id OR p.active<>1 OR p.price<>i.price OR p.stock<(SELECT SUM(j.quantity) FROM public.request_items j WHERE j.request_id=NEW.id AND j.product_id=p.id))) THEN RAISE EXCEPTION 'stock_or_price_changed'; END IF;
  UPDATE public.products p SET stock=p.stock-q.quantity,revision=p.revision+1,stock_reason='Order '||NEW.id FROM(SELECT product_id,SUM(quantity)::integer AS quantity FROM public.request_items WHERE request_id=NEW.id GROUP BY product_id)q WHERE p.id=q.product_id AND p.store_id=NEW.store_id;
 ELSE
  PERFORM id FROM public.products WHERE id=NEW.target_id ORDER BY id FOR UPDATE;
  IF OLD.status<>'quoted' OR NEW.credit IS NULL OR NEW.credit<0 OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=NEW.target_id AND store_id=NEW.store_id AND active=1 AND stock>=1 AND price=NEW.quote_price AND NEW.credit<=price) THEN RAISE EXCEPTION 'swap_needs_valid_quote_and_stock'; END IF;
  UPDATE public.products SET stock=stock-1,revision=revision+1,stock_reason='Completed swap '||NEW.id WHERE id=NEW.target_id AND store_id=NEW.store_id;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER complete_request BEFORE UPDATE OF status ON public.requests FOR EACH ROW EXECUTE FUNCTION public.complete_request_stock();
REVOKE ALL ON FUNCTION public.log_product_stock(),public.record_physical_sale(),public.complete_request_stock() FROM PUBLIC,anon,authenticated;

-- Both buckets are private; public product photos are streamed through the API,
-- while swap photo routes additionally verify store ownership.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('product-assets','product-assets',false,2097152,ARRAY['image/jpeg','image/png','image/webp']),
 ('swap-photos','swap-photos',false,2097152,ARRAY['image/jpeg','image/png','image/webp'])
 ON CONFLICT(id) DO NOTHING;
COMMIT;
