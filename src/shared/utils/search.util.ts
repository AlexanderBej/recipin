export function makeTitleSearch(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD') // split accents
    .replace(/\p{Diacritic}/gu, ''); // remove accents
}
