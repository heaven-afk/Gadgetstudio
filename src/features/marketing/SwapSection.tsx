import Link from 'next/link';
export function SwapSection() {
  return (
    <section className="swap-feature">
      <div>
        <span className="eyebrow">ANOTHER WAY TO UPGRADE</span>
        <h2>
          A device to trade.
          <br />A conversation to <em>start.</em>
        </h2>
        <p>
          Customers share photos and condition details. You assess the device,
          set the trade-in credit and agree any top-up before completing the
          swap.
        </p>
        <Link className="btn btn-dark" href="/demo#swap-section">
          Explore device swaps ↗
        </Link>
      </div>
      <div className="swap-visual">
        <div>
          <span>THEIR DEVICE</span>
          <b>
            A little
            <br />
            <em>pre-loved.</em>
          </b>
        </div>
        <i>⇄</i>
        <div>
          <span>THEIR NEXT CHAPTER</span>
          <b>
            A new
            <br />
            <em>possibility.</em>
          </b>
        </div>
      </div>
    </section>
  );
}
