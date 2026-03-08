import { useEffect, useState } from 'react'

const DESKTOP_BREAKPOINT = 768

const getIsDesktop = () => window.innerWidth >= DESKTOP_BREAKPOINT

export const useViewportMode = () => {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop)

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(getIsDesktop())
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { isDesktop }
}
