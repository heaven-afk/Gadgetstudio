import type {Metadata} from 'next';
import './platform.css';
export const metadata:Metadata={title:{default:'Heaven — A better way to sell gadgets',template:'%s · Heaven'},description:'Your own gadget storefront. Clear inventory, device swaps and orders sent to your WhatsApp.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
