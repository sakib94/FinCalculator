import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/**
 * The opening of every non-calculator page: an eyebrow that says where you
 * are, a display-face title, a lead paragraph and optional meta or actions.
 */
export function PageHeader({
  icon,
  eyebrow,
  title,
  lead,
  meta,
  children,
}: {
  icon?: IconName;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      {eyebrow && (
        <p className="eyebrow">
          {icon ? <Icon name={icon} size={14} /> : <span className="eyebrow-dot" aria-hidden="true" />}
          {eyebrow}
        </p>
      )}
      <h1>{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
      {meta && <p className="page-meta">{meta}</p>}
      {children}
    </header>
  );
}
