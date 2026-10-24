
import { useEffect, useState } from "react";
import "./ContinueWatching.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ContinueWatching({ token, anime = null }) {
  const [items, setItems] = useState([]);
  const [episode, setEpisode] = useState("1");
  const [position, setPosition] = useState("0");
  const [duration, setDuration] = useState("1440");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const animeId = anime?.id == null ? "" : String(anime.id);
  const saved = items.find((item) => item.animeId === animeId);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }

    const controller = new AbortController();

    async function loadProgress() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/api/progress`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load watch progress.");
        }

        setItems(data.watchProgress || []);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProgress();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!anime) return;

    const current = items.find(
      (item) => item.animeId === String(anime.id)
    );

    setEpisode(String(current?.episode ?? 1));
    setPosition(String(current?.positionSeconds ?? 0));
    setDuration(String(current?.durationSeconds || 1440));
    setMessage("");
  }, [anime?.id, items]);

  async function saveProgress(event) {
    event.preventDefault();

    if (!token) {
      setError("Log in to save your watch progress.");
      return;
    }

    const episodeNumber = Number(episode);
    const positionSeconds = Number(position);
    const durationSeconds = Number(duration);

    if (
      !Number.isInteger(episodeNumber) ||
      episodeNumber < 1 ||
      !Number.isFinite(positionSeconds) ||
      !Number.isFinite(durationSeconds) ||
      positionSeconds < 0 ||
      durationSeconds <= 0 ||
      positionSeconds > durationSeconds
    ) {
      setError("Enter a valid episode, position, and duration.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/progress/${encodeURIComponent(anime.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: anime.title,
            episode: episodeNumber,
            positionSeconds,
            durationSeconds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save progress.");
      }

      setItems((current) => {
        const next = current.filter(
          (item) => item.animeId !== String(anime.id)
        );

        return [...next, data.progress || {
          animeId: String(anime.id),
          title: anime.title,
          episode: episodeNumber,
          positionSeconds,
          durationSeconds,
          updatedAt: new Date().toISOString(),
        }];
      });

      setMessage("Watch progress saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProgress(animeIdToRemove) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/progress/${encodeURIComponent(animeIdToRemove)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to remove progress.");
      }

      setItems((current) =>
        current.filter((item) => item.animeId !== animeIdToRemove)
      );
      setMessage("Watch progress removed.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <section className="progress-section">
        <h2>Continue Watching</h2>
        <p>Log in to save your episode and playback progress.</p>
      </section>
    );
  }

  if (anime) {
    const percent = duration > 0
      ? Math.min(100, (Number(position) / Number(duration)) * 100)
      : 0;

    return (
      <section className="progress-section">
        <h2>Watch Progress</h2>
        <p className="progress-subtitle">
          Save where you are in {anime.title}.
        </p>

        <form className="progress-form" onSubmit={saveProgress}>
          <label>
            Episode
            <input
              type="number"
              min="1"
              step="1"
              value={episode}
              onChange={(event) => setEpisode(event.target.value)}
              required
            />
          </label>

          <label>
            Position (seconds)
            <input
              type="number"
              min="0"
              step="1"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              required
            />
          </label>

          <label>
            Duration (seconds)
            <input
              type="number"
              min="1"
              step="1"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
          </label>

          <div className="progress-preview">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span>{Math.round(percent)}% watched</span>
          </div>

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save watch progress"}
          </button>
        </form>

        {saved && (
          <p className="progress-subtitle">
            Previously saved: episode {saved.episode}, at{" "}
            {Math.floor(saved.positionSeconds / 60)} min{" "}
            {saved.positionSeconds % 60} sec.
          </p>
        )}

        {error && <p className="progress-error">{error}</p>}
        {message && <p className="progress-success">{message}</p>}
      </section>
    );
  }

  return (
    <section className="progress-section" id="continue-watching">
      <div className="progress-heading">
        <div>
          <span className="section-kicker">YOUR WATCH HISTORY</span>
          <h2>Continue Watching</h2>
        </div>
        <span>{items.length} titles</span>
      </div>

      {loading ? (
        <p>Loading your watch progress...</p>
      ) : error ? (
        <p className="progress-error">{error}</p>
      ) : items.length === 0 ? (
        <p>Your saved episodes will appear here.</p>
      ) : (
        <div className="progress-grid">
          {items.map((item) => {
            const percent = item.durationSeconds > 0
              ? Math.min(
                  100,
                  (item.positionSeconds / item.durationSeconds) * 100
                )
              : 0;

            return (
              <article className="progress-card" key={item.animeId}>
                <div className="progress-card-copy">
                  <h3>{item.title}</h3>
                  <p>
                    Episode {item.episode} ·{" "}
                    {Math.floor(item.positionSeconds / 60)} min watched
                  </p>
                </div>

                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label={`${item.title} progress`}
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="progress-card-actions">
                  <span>{Math.round(percent)}%</span>
                  <button
                    type="button"
                    className="progress-remove"
                    onClick={() => removeProgress(item.animeId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {error && <p className="progress-error">{error}</p>}
      {message && <p className="progress-success">{message}</p>}
    </section>
  );
}
