import { useEffect, useState } from "react";
import "./App.css";
import AuthPanel from "./AuthPanel";
import ContinueWatching from "./ContinueWatching";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function AnimeCard({ anime, onSelect }) {
  return (
    <button
      className="anime-card"
      onClick={() => onSelect(anime)}
      aria-label={`View ${anime.title}`}
    >
      <div className="poster-wrap">
        <img
          className="poster"
          src={anime.coverImage}
          alt={anime.title}
          loading="lazy"
        />
        <span className="poster-score">
          ★ {anime.score ? (anime.score / 10).toFixed(1) : "NR"}
        </span>
        <span className="poster-action">View details ↗</span>
      </div>
      <div className="card-info">
        <h3>{anime.title}</h3>
        <p>
          {anime.year || "Anime"} <span>·</span>{" "}
          {anime.episodes ? `${anime.episodes} episodes` : "Episodes TBA"}
        </p>
      </div>
    </button>
  );
}

export default function App() {
  const [anime, setAnime] = useState([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("animesage-token") || "",
  );
  const [user, setUser] = useState(null);

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("animesage-watchlist")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnime() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ page: "1" });
        if (submittedSearch) params.set("search", submittedSearch);

        const response = await fetch(
          `${API_URL}/api/anime?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Unable to load anime. Please try again.");
        }

        const data = await response.json();
        setAnime(data.results || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAnime();
    return () => controller.abort();
  }, [submittedSearch]);

  
async function toggleWatchlist(item) {
  const exists = watchlist.some((entry) => entry.id === item.id);

  if (!token || !user) {
    const updated = exists
      ? watchlist.filter((entry) => entry.id !== item.id)
      : [...watchlist, item];

    setWatchlist(updated);
    localStorage.setItem("animesage-watchlist", JSON.stringify(updated));
    return;
  }

  try {
    const response = await fetch(
      exists
        ? `${API_URL}/api/watchlist/${item.id}`
        : `${API_URL}/api/watchlist`,
      {
        method: exists ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(exists
          ? {}
          : {
              body: JSON.stringify({
                animeId: item.id,
                title: item.title,
                coverImage: item.coverImage || "",
              }),
            }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to update your watchlist.");
    }

    const updated = data.watchlist.map((entry) => ({
      id: entry.animeId,
      title: entry.title,
      coverImage: entry.coverImage,
    }));

    setWatchlist(updated);
    localStorage.setItem("animesage-watchlist", JSON.stringify(updated));
  } catch (error) {
    alert(error.message);
  }
}


useEffect(() => {
  if (!token || !user) return;

  const controller = new AbortController();

  async function loadWatchlist() {
    try {
      const response = await fetch(`${API_URL}/api/watchlist`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Unable to load your saved anime.");
      }

      const data = await response.json();
      const saved = data.watchlist.map((entry) => ({
        id: entry.animeId,
        title: entry.title,
        coverImage: entry.coverImage,
      }));

      setWatchlist(saved);
      localStorage.setItem("animesage-watchlist", JSON.stringify(saved));
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(error.message);
      }
    }
  }

  loadWatchlist();
  return () => controller.abort();
}, [token, user]);


  function submitSearch(event) {
    event.preventDefault();
    setSelected(null);
    setSubmittedSearch(search.trim());
  }

  const isSaved = selected
    ? watchlist.some((item) => item.id === selected.id)
    : false;

  function handleAuthSuccess(newToken, newUser) {
    localStorage.setItem("animesage-token", newToken);
    setToken(newToken);
    setUser(newUser);
  }

function handleLogout() {
  localStorage.removeItem("animesage-token");
  setToken("");
  setUser(null);
  setWatchlist([]);
}

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        return response.json();
      })
      .then((data) => setUser(data.user))
      .catch((error) => {
        if (error.name !== "AbortError") handleLogout();
      });

    return () => controller.abort();
  }, [token]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={() => {
            setSelected(null);
            setSearch("");
            setSubmittedSearch("");
          }}
        >
          <span className="brand-mark">A</span>
          <span>
            anime<span className="brand-accent">sage</span>
          </span>
        </a>

        <nav className="main-nav">
          <a className="active" href="#discover">
            Discover
          </a>
          <a href="#catalogue">Anime</a>
          <a href="#watchlist">
            My List <span className="list-count">{watchlist.length}</span>
          </a>
        </nav>

        <form className="search-form" onSubmit={submitSearch}>
          <span className="search-icon">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search anime..."
            aria-label="Search anime"
          />
          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearch("");
                setSubmittedSearch("");
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </form>
        <AuthPanel
          token={token}
          user={user}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleLogout}
        />
      </header>

      <main>
        {!selected ? (
          <>
            <section className="hero" id="discover">
              <div className="hero-glow" />
              <div className="hero-content">
                <span className="eyebrow">
                  <span className="live-dot" /> YOUR NEXT OBSESSION STARTS HERE
                </span>
                <h1>
                  Find your next
                  <br /> <span>anime obsession.</span>
                </h1>
                <p>
                  Discover new worlds, unforgettable characters, and stories
                  worth staying up for.
                </p>
                <button
                  className="primary-button"
                  onClick={() =>
                    document.getElementById("catalogue")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  Explore anime <span>↗</span>
                </button>
                <div className="hero-note">
                  <span className="note-line" /> A universe of stories, all one
                  click away
                </div>
              </div>
              <div className="hero-art">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-core">葵</div>
                <div className="art-label art-label-top">ANIME / 01</div>
                <div className="art-label art-label-bottom">
                  DISCOVER THE UNKNOWN
                </div>
              </div>
              <div className="hero-index">
                01 <span>/ 04</span>
              </div>
            </section>

            <section className="catalogue section" id="catalogue">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    {submittedSearch ? "SEARCH RESULTS" : "HANDPICKED FOR YOU"}
                  </span>
                  <h2>
                    {submittedSearch
                      ? `Results for "${submittedSearch}"`
                      : "Trending now"}
                  </h2>
                </div>
                <span className="results-label">
                  {anime.length} TITLES <span className="results-dot">●</span>
                </span>
              </div>

              {loading ? (
                <div className="status-message">
                  Discovering your next favourite...
                </div>
              ) : error ? (
                <div className="status-message error-message">
                  <p>{error}</p>
                  <button
                    className="secondary-button"
                    onClick={() => setSubmittedSearch((s) => s + " ")}
                  >
                    Retry
                  </button>
                </div>
              ) : anime.length === 0 ? (
                <div className="status-message">
                  No titles found, Try a different anime name.
                </div>
              ) : (
                <div className="anime-grid">
                  {anime.map((item) => (
                    <AnimeCard
                      key={item.id}
                      anime={item}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              )}
            </section>

            <ContinueWatching token={token} />

            {watchlist.length > 0 && (
              <section className="section watchlist-section" id="watchlist">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">
                      YOUR PERSONAL COLLECTION
                    </span>
                    <h2>Saved for later</h2>
                  </div>
                  <span className="results-label">
                    {watchlist.length} SAVED
                  </span>
                </div>
                <div className="anime-grid">
                  {watchlist.map((item) => (
                    <AnimeCard
                      key={item.id}
                      anime={item}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="detail-page">
            <button className="back-button" onClick={() => setSelected(null)}>
              ← Back to discover
            </button>
            <div className="detail-layout">
              <img
                className="detail-poster"
                src={selected.coverImage}
                alt={selected.title}
              />
              <div className="detail-copy">
                <span className="section-kicker">
                  ANIMESAGE / ANIME PROFILE
                </span>
                <h1>{selected.title}</h1>
                <div className="detail-meta">
                  <span>
                    ★ {selected.score ? (selected.score / 10).toFixed(1) : "NR"}
                  </span>
                  <span>{selected.year || "Year TBA"}</span>
                  <span>{selected.episodes || "?"} episodes</span>
                </div>
                <div className="genre-list">
                  {selected.genres?.map((genre) => (
                    <span key={genre} className="genre-tag">
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="detail-description">
                  {selected.description?.replace(/<[^>]*>/g, "") || "No description available."}
                </p>
                <button
                  className="primary-button"
                  onClick={() => toggleWatchlist(selected)}
                >
                  {isSaved ? "✓ Saved to my list" : "+ Add to my list"}
                </button>
                <p className="playback-note">
                  Video playback will be enabled in a later stage using an
                  authorised video source.
                </p>
              </div>
            </div>
          </section>
        )}
        <ContinueWatching token={token} anime={selected} />
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">A</span>
          <span>
            anime<span className="brand-accent">sage</span>
          </span>
        </a>
        <p>Discover stories beyond imagination.</p>
        <span className="footer-status">
          <span className="live-dot" /> ALL SYSTEMS DESIGNED FOR DISCOVERY
        </span>
      </footer>
    </div>
  );
}
