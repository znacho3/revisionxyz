export type PredictedPaper = {
  _id: string;
  _createdAt: string;
  title: string;
  slug: { _type: string; current: string };
  subject: { title: string; slug: { current: string } };
  thumbnail: string;
  blurredThumbnail: string;
  durationInMinutes: number;
  examYear: string;
  level: string;
  paperType: string;
  premium: boolean;
  questionPaper: { _id: string } | null;
};
