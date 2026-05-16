interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** 워드마크 숨기고 아이콘만 */
  iconOnly?: boolean;
}

export default function BrandMark({ size = 'md', className = '', iconOnly = false }: Props) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 56 : 44;
  const radius = Math.round(dim * 0.3);
  const checkSize = Math.round(dim * 0.52);
  const fontSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="flex items-center justify-center"
        style={{
          width: dim,
          height: dim,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #3182F6 0%, #1B64DA 100%)',
          boxShadow: '0 4px 12px rgba(49, 130, 246, 0.35)',
        }}>
        <svg width={checkSize} height={checkSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l5 5L20 7"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!iconOnly && (
        <div
          className="flex items-baseline"
          style={{
            fontSize,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--text-900)',
          }}>
          <span>챙김</span>
          <span style={{ color: '#3182F6', marginLeft: 2 }}>.</span>
        </div>
      )}
    </div>
  );
}
