import { Spinner } from "@heroui/react";

function Loader() {
  return (
    <div className="flex min-h-[120px] w-full items-center justify-center">
      <Spinner label="Loading..." labelColor="foreground" size="lg" />
    </div>
  );
}

export default Loader;
