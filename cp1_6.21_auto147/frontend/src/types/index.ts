export interface Course {
  id: number
  title: string
  description: string
  instructor: string
  video_url: string
  thumbnail: string
  created_at: string
  total_chapters?: number
  completed_chapters?: number
  progress?: number
  is_completed?: boolean
}

export interface Chapter {
  id: number
  course_id: number
  title: string
  duration: string
  video_start_time: number
  quiz_id: number | null
  sort_order: number
  is_completed?: number
  score?: number
  total_questions?: number
}

export interface CourseDetail extends Course {
  chapters: Chapter[]
}

export interface Option {
  id: number
  question_id: number
  option_text: string
  is_correct: number
  sort_order: number
}

export interface Question {
  id: number
  quiz_id: number
  question_text: string
  question_type: 'single' | 'multiple'
  sort_order: number
  options: Option[]
}

export interface Quiz {
  id: number
  course_id: number
  chapter_id: number | null
  title: string
  questions: Question[]
}

export interface QuizResult {
  score: number
  total_questions: number
  percentage: number
  results: {
    question_id: number
    is_correct: number
    correct_options: number[]
    user_answer: number[]
  }[]
}

export interface UserProgress {
  id: number
  user_id: number
  course_id: number
  chapter_id: number | null
  completed: number
  score: number | null
  total_questions: number | null
  completed_at: string | null
}
