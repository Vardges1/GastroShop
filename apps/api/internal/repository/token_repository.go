package repository

import (
	"database/sql"
	"time"
)

type RefreshToken struct {
	ID        int
	UserID    int
	Token     string
	ExpiresAt time.Time
	CreatedAt time.Time
	RevokedAt *time.Time
}

type TokenRepository struct {
	db *sql.DB
}

func NewTokenRepository(db *sql.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

func (r *TokenRepository) CreateRefreshToken(userID int, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.Exec(query, userID, token, expiresAt)
	return err
}

func (r *TokenRepository) GetRefreshToken(token string) (*RefreshToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, created_at, revoked_at
		FROM refresh_tokens
		WHERE token = $1
	`

	var rt RefreshToken
	err := r.db.QueryRow(query, token).Scan(
		&rt.ID, &rt.UserID, &rt.Token, &rt.ExpiresAt, &rt.CreatedAt, &rt.RevokedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &rt, nil
}

func (r *TokenRepository) RevokeRefreshToken(token string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE token = $1 AND revoked_at IS NULL
	`
	_, err := r.db.Exec(query, token)
	return err
}

func (r *TokenRepository) RevokeAllUserTokens(userID int) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
	`
	_, err := r.db.Exec(query, userID)
	return err
}

func (r *TokenRepository) CleanExpiredTokens() error {
	query := `
		DELETE FROM refresh_tokens
		WHERE expires_at < NOW()
	`
	_, err := r.db.Exec(query)
	return err
}





















