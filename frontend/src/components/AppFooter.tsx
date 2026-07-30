export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-brand-200 bg-brand-900 py-6 text-center text-sm text-brand-100">
      <p>The Premier Commodity Exchange Platform - Connecting verified Fellows with Markets.</p>
      <p className="mt-1 text-xs text-brand-300">
        © {new Date().getFullYear()} Agricess Network International — ANI. All rights reserved.
      </p>
    </footer>
  );
}
