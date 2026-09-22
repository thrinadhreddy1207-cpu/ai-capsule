import { Link } from 'react-router-dom';

export default function Header({ children }) {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true" />
        AI Capsule
      </Link>
      <nav className="header-actions">{children}</nav>
    </header>
  );
}
