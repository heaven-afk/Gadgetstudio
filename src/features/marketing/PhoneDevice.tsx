export function PhoneDevice({
  finish = 'titanium',
  back = false,
}: {
  finish?: 'titanium' | 'graphite';
  back?: boolean;
}) {
  return (
    <div
      className={`device-phone device-${finish} ${back ? 'device-back' : 'device-front'}`}
      aria-hidden="true"
    >
      {back ? (
        <>
          <div className="device-camera-cluster">
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className="device-back-mark" />
        </>
      ) : (
        <div className="device-screen">
          <div className="device-island" />
          <span className="device-screen-orbit orbit-one" />
          <span className="device-screen-orbit orbit-two" />
          <span className="device-screen-orbit orbit-three" />
          <div className="device-home-bar" />
        </div>
      )}
      <span className="device-side-button" />
    </div>
  );
}
