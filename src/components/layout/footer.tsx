export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <span>minilink</span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
