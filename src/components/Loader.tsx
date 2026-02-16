import { Progress } from "@heroui/react";

function Loader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="w-full max-w-md px-6">
        <Progress
          isIndeterminate
          aria-label="Loading..."
          size="sm"
        />
      </div>
    </div>
  );
}

export default Loader;
