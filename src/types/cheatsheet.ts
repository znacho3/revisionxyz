export type Cheatsheet = {
  id: string
  title: string
  description: string | null
  r2Key: string
  fileSize: number
  createdAt: string
  isPremium: boolean
  subjectTitle: string
  subjectSlug: string
  subjectGroupName: string
  examBoardSlug: string
  topicTitle: string
  topicId?: number | null
  parentTopicId?: number | null
  parentTopicTitle?: string | null
  thumbnailR2Key: string
  thumbnailUrl: string
  blurredThumbnailUrl: string
  subjectId: number
}
