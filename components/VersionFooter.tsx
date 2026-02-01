import { useEffect, useState } from 'react';

export default function VersionFooter() {
  const [version, setVersion] = useState<any>(null);

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => {});
  }, []);

  if (!version) return null;

  const buildDate = new Date(version.buildTime).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed bottom-4 right-4 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/60 border border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-white/80 font-semibold">v{version.version}</span>
        <span>•</span>
        <span>{buildDate}</span>
      </div>
    </div>
  );
}
