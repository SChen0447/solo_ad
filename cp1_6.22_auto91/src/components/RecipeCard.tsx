import { Clock, User } from 'lucide-react'
import { Link } from 'react-router-dom'

interface RecipeCardProps {
  id: string
  title: string
  coverImage: string
  description: string
  cookTime: number
  author: string
  index?: number
}

export default function RecipeCard({ id, title, coverImage, cookTime, author, index = 0 }: RecipeCardProps) {
  const coverUrl = coverImage || `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20${encodeURIComponent(title)}%20food%20photography%20professional%20plating%20warm%20lighting&image_size=landscape_4_3`

  return (
    <Link
      to={`/recipe/${id}`}
      className="recipe-card group block w-[300px] rounded-2xl bg-white overflow-hidden cursor-pointer"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        animationDelay: `${index * 0.1}s`,
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      }}
    >
      <div className="relative w-full h-[156px] overflow-hidden">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-serif text-lg font-bold text-gray-800 mb-2 line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {cookTime}分钟
          </span>
          <span className="flex items-center gap-1">
            <User size={14} />
            {author}
          </span>
        </div>
      </div>
    </Link>
  )
}
