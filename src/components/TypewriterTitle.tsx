import { useEffect, useState } from 'react'

interface TypewriterTitleProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
}

export function TypewriterTitle({ text, speed = 30, className = '', onComplete }: TypewriterTitleProps) {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!text) return

    setDisplayText('')
    setIsComplete(false)
    let index = 0

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
        setIsComplete(true)
        onComplete?.()
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, onComplete])

  return (
    <span className={className}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  )
}
