interface Track {
  title: string;
  artists: string;
  album: string;
  duration: number;
  src: string;
  cover?: string;
  lyrics?: string;
}
const key = (song: Track) =>
  `${song.title.trim().toLowerCase()}|${song.artists.trim().toLowerCase()}`;
const version = (song: Track) =>
  song.album
    .match(/live|现场|伴奏|重制|remaster|remix/gi)
    ?.join()
    .toLowerCase() || "";
function score(song: Track) {
  return (
    (song.src.endsWith(".flac") ? 30 : song.src.endsWith(".m4a") ? 20 : 10) +
    (/精选|珍藏|合辑/.test(song.album) ? 0 : 5) +
    (song.album !== song.title ? 2 : 0) +
    (song.cover ? 1 : 0) +
    (song.lyrics ? 1 : 0)
  );
}
/** Collapse equivalent catalog editions; preserve named versions and different durations. */
export function deduplicateMusic<T extends Track>(songs: T[]): T[] {
  const selected: T[] = [];
  for (const song of songs) {
    const index = selected.findIndex(
      (item) =>
        key(item) === key(song) &&
        version(item) === version(song) &&
        Math.abs(item.duration - song.duration) <= 3,
    );
    if (index < 0) selected.push(song);
    else if (score(song) > score(selected[index])) selected[index] = song;
  }
  return selected;
}
