interface NotebookCoverProps {
  coverType: string | null;
  coverData: string | null;
  title: string;
  mini?: boolean;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function NotebookCover({ coverType, coverData, title, mini }: NotebookCoverProps) {
  if (coverType === 'custom' && coverData && coverData.startsWith('http')) {
    return (
      <img
        src={coverData}
        alt={title}
        className="w-full h-full object-cover"
      />
    );
  }

  const style = coverData ?? 'cover-black';
  const recognized = ['cover-black', 'cover-white', 'cover-gray', 'cover-lines'];
  const finalStyle = recognized.includes(style) ? style : 'cover-black';

  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {finalStyle === 'cover-black' && <CoverBlack title={title} mini={mini} />}
      {finalStyle === 'cover-white' && <CoverWhite title={title} mini={mini} />}
      {finalStyle === 'cover-gray' && <CoverGray title={title} mini={mini} />}
      {finalStyle === 'cover-lines' && <CoverLines title={title} mini={mini} />}
    </svg>
  );
}

function CoverBlack({ title, mini }: { title: string; mini?: boolean }) {
  return (
    <>
      <rect width="300" height="400" fill="#0A0A0A" />
      <rect x="2" y="2" width="296" height="396" fill="none" stroke="#1F1F1F" strokeWidth="1" />
      {!mini && (
        <>
          <line x1="40" y1="80" x2="260" y2="80" stroke="#FAFAFA" strokeWidth="0.5" opacity="0.4" />
          <text x="150" y="210" textAnchor="middle" fill="#FAFAFA" fontFamily="serif" fontSize="22" fontWeight="500">
            {truncate(title, 20)}
          </text>
          <line x1="40" y1="240" x2="260" y2="240" stroke="#FAFAFA" strokeWidth="0.5" opacity="0.4" />
          <text x="150" y="370" textAnchor="middle" fill="#FAFAFA" fontFamily="sans-serif" fontSize="10" letterSpacing="3" opacity="0.6">
            NOMOS
          </text>
        </>
      )}
    </>
  );
}

function CoverWhite({ title, mini }: { title: string; mini?: boolean }) {
  return (
    <>
      <rect width="300" height="400" fill="#FAFAFA" />
      <rect x="2" y="2" width="296" height="396" fill="none" stroke="#E5E5E5" strokeWidth="1" />
      {!mini && (
        <>
          <line x1="40" y1="80" x2="260" y2="80" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.4" />
          <text x="150" y="210" textAnchor="middle" fill="#0A0A0A" fontFamily="serif" fontSize="22" fontWeight="500">
            {truncate(title, 20)}
          </text>
          <line x1="40" y1="240" x2="260" y2="240" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.4" />
          <text x="150" y="370" textAnchor="middle" fill="#0A0A0A" fontFamily="sans-serif" fontSize="10" letterSpacing="3" opacity="0.6">
            NOMOS
          </text>
        </>
      )}
    </>
  );
}

function CoverGray({ title, mini }: { title: string; mini?: boolean }) {
  return (
    <>
      <rect width="300" height="400" fill="#737373" />
      <rect x="2" y="2" width="296" height="396" fill="none" stroke="#525252" strokeWidth="1" />
      {!mini && (
        <>
          <line x1="40" y1="80" x2="260" y2="80" stroke="#FAFAFA" strokeWidth="0.5" opacity="0.5" />
          <text x="150" y="210" textAnchor="middle" fill="#FAFAFA" fontFamily="serif" fontSize="22" fontWeight="500">
            {truncate(title, 20)}
          </text>
          <line x1="40" y1="240" x2="260" y2="240" stroke="#FAFAFA" strokeWidth="0.5" opacity="0.5" />
          <text x="150" y="370" textAnchor="middle" fill="#FAFAFA" fontFamily="sans-serif" fontSize="10" letterSpacing="3" opacity="0.7">
            NOMOS
          </text>
        </>
      )}
    </>
  );
}

function CoverLines({ title, mini }: { title: string; mini?: boolean }) {
  const lines = [];
  for (let y = 30; y < 400; y += 14) {
    lines.push(
      <line key={y} x1="20" y1={y} x2="280" y2={y} stroke="#0A0A0A" strokeWidth="0.4" opacity="0.18" />
    );
  }
  return (
    <>
      <rect width="300" height="400" fill="#FAFAFA" />
      {lines}
      <rect x="2" y="2" width="296" height="396" fill="none" stroke="#E5E5E5" strokeWidth="1" />
      {!mini && (
        <>
          <rect x="20" y="180" width="260" height="60" fill="#FAFAFA" />
          <text x="150" y="218" textAnchor="middle" fill="#0A0A0A" fontFamily="serif" fontSize="22" fontWeight="500">
            {truncate(title, 20)}
          </text>
          <rect x="100" y="355" width="100" height="20" fill="#FAFAFA" />
          <text x="150" y="370" textAnchor="middle" fill="#0A0A0A" fontFamily="sans-serif" fontSize="10" letterSpacing="3" opacity="0.6">
            NOMOS
          </text>
        </>
      )}
    </>
  );
}
