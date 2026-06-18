package services

import (
	"math"
	"time"

	"github.com/vimtrainer/api/internal/models"
)

// UpdateSRS applies the SM-2 algorithm to a spaced repetition record.
// quality: 0=blackout, 1=wrong, 2=wrong-easy, 3=correct-hard, 4=correct, 5=perfect
func UpdateSRS(record *models.SpacedRepetitionRecord, quality int, responseMs int) {
	record.TotalReviews++
	if quality >= 3 {
		record.CorrectReviews++
	}

	ef := record.EaseFactor + (0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02))
	if ef < 1.3 {
		ef = 1.3
	}
	record.EaseFactor = math.Round(ef*100) / 100

	if quality < 3 {
		record.Repetitions = 0
		record.IntervalDays = 1
	} else {
		record.Repetitions++
		switch record.Repetitions {
		case 1:
			record.IntervalDays = 1
		case 2:
			record.IntervalDays = 6
		default:
			record.IntervalDays = int(math.Round(float64(record.IntervalDays) * record.EaseFactor))
		}
	}

	now := time.Now()
	record.LastReviewedAt = &now
	record.NextReviewAt = now.Add(time.Duration(record.IntervalDays) * 24 * time.Hour)
	if responseMs > 0 {
		record.AvgResponseMs = &responseMs
	}
}
