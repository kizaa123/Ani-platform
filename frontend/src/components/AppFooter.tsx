export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-brand-200 bg-brand-900 px-3 py-2.5 text-center text-brand-100 sm:px-4 sm:py-6">
      <p className="text-[11px] leading-snug sm:text-sm sm:leading-normal">
        The Premier Commodity Exchange Platform
        <span className="hidden sm:inline"> - </span>
        <span className="block sm:inline">Connecting verified Fellows with Markets.</span>
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-brand-300 sm:mt-1 sm:text-xs sm:leading-normal">
        © {new Date().getFullYear()} Agricess Network International - ANI. All rights reserved.
      </p>
    </footer>
  );
}
