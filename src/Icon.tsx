export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    agents: "M12 8V4H8 M4 8h16v12H4z M8 13v2 M16 13v2 M2 14h2 M20 14h2",
    skills:
      "M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-3H2z M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-3h6z",
    packs: "m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10",
    usage: "M3 19a10 10 0 1 1 18 0 M12 14l4-4",
    side: "M3 3h18v18H3z M9 3v18",
    theme: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9",
    plus: "M5 12h14 M12 5v14",
    arrow: "M12 19V5 M5 12l7-7 7 7",
    close: "m6 6 12 12 M6 18 18 6",
    settings:
      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12l2-1-2-4-2 1-2-1-1-3h-4l-1 3-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1 1 3h4l1-3 2-1 2 1 2-4-2-1z",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.agents} />
    </svg>
  );
}
