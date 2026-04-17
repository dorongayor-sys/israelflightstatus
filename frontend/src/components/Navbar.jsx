import { Link, useNavigate, useLocation } from 'react-router-dom';

function PlaneIcon() {
  return (
    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

export default function Navbar({ isAdmin = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center border border-blue-500/25 group-hover:bg-blue-500/25 transition-colors">
              <PlaneIcon />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-white leading-none">Aviation Updates</span>
              <p className="text-xs text-slate-500 leading-none mt-0.5">Israel Flights Status</p>
            </div>
          </Link>

          {/* Telegram link — centered on desktop, near icon on mobile */}
          <span
            style={{ fontSize: '14px' }}
            className="text-slate-400 sm:absolute sm:left-1/2 sm:-translate-x-1/2 whitespace-nowrap"
          >
            Follow us on Telegram{' '}
            <a
              href="https://t.me/AviationupdatesDG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              click here
            </a>
          </span>

          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <>
                {username && (
                  <span className="text-xs text-slate-500 hidden sm:block mr-2">{username}</span>
                )}
                <Link
                  to="/"
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Public View
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Logout
                </button>
              </>
            ) : null}
          </div>

        </div>
      </div>
    </nav>
  );
}
