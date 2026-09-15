export type DirectoryRankItem = {
  name: string;
  href: string;
  image: string;
  description: string;
  category: string;
  views?: number;
  country?: string;
  bookmarkKind: 'bot' | 'ainsfw' | 'explore';
  bookmarkId: string;
};
