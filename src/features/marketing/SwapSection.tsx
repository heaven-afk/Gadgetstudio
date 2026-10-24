import Link from 'next/link';
import { PhoneDevice } from './PhoneDevice';
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
        <Link className="btn btn-dark" href="/sign-up">
          Start accepting swaps
        </Link>
      </div>
      <div
        className="swap-gadgets"
        role="img"
        aria-label="A graphite smartphone traded toward a new titanium smartphone."
      >
        <div className="swap-device swap-device-before">
          <span>THEIR DEVICE</span>
          <PhoneDevice finish="graphite" back />
          <p>
            A little <em>pre-loved.</em>
          </p>
        </div>
        <div className="swap-connection" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="swap-device swap-device-after">
          <span>THEIR NEXT CHAPTER</span>
          <PhoneDevice />
          <p>
            A new <em>possibility.</em>
          </p>
        </div>
      </div>
    </section>
  );
}
