// Spaced-repetition scheduling — an SM-2 variant with Anki-style grades.
// review shape: { due:'YYYY-MM-DD', interval:days, ease, reps, lapses, last }

const DAY = 86400000
const round2 = (n) => Math.round(n * 100) / 100

export const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  return new Date(d.getTime() + n * DAY).toISOString().slice(0, 10)
}

export const GRADES = [
  { key: 'again', label: 'Again' },
  { key: 'hard', label: 'Hard' },
  { key: 'good', label: 'Good' },
  { key: 'easy', label: 'Easy' },
]

// A fresh schedule (used when adding a topic to the review queue).
export const newReview = (today) => ({ due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0, last: null })

export function gradeReview(review, grade, today) {
  let { interval = 0, ease = 2.5, reps = 0, lapses = 0 } = review || {}

  if (grade === 'again') {
    reps = 0
    lapses += 1
    ease = Math.max(1.3, ease - 0.2)
    interval = 1
  } else {
    if (grade === 'hard') {
      ease = Math.max(1.3, ease - 0.15)
      interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2))
    } else if (grade === 'easy') {
      ease = ease + 0.15
      interval = reps === 0 ? 4 : Math.max(1, Math.round(interval * ease * 1.3))
    } else {
      // good
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(interval * ease))
    }
    reps += 1
  }

  return { due: addDays(today, Math.max(1, interval)), interval, ease: round2(ease), reps, lapses, last: today }
}

// Human-readable "next due in N days" preview for a grade button.
export function previewInterval(review, grade) {
  const r = gradeReview(review, grade, '2000-01-01')
  return r.interval
}
