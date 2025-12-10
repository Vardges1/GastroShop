package repository

import (
	"database/sql"
	"time"

	"gastroshop-api/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, role, blocked)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.db.QueryRow(query, user.Email, user.PasswordHash, user.Role, user.Blocked).Scan(&user.ID, &user.CreatedAt)
}

func (r *UserRepository) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, blocked, email_verified, 
		       email_verification_token, email_verification_token_expires_at,
		       password_reset_token, password_reset_token_expires_at, created_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	var emailVerToken, passResetToken sql.NullString
	var emailVerExpires, passResetExpires sql.NullTime

	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Blocked, &user.EmailVerified,
		&emailVerToken, &emailVerExpires, &passResetToken, &passResetExpires, &user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if emailVerToken.Valid {
		token := emailVerToken.String
		user.EmailVerificationToken = &token
	}
	if emailVerExpires.Valid {
		user.EmailVerificationTokenExpiresAt = &emailVerExpires.Time
	}
	if passResetToken.Valid {
		token := passResetToken.String
		user.PasswordResetToken = &token
	}
	if passResetExpires.Valid {
		user.PasswordResetTokenExpiresAt = &passResetExpires.Time
	}

	return &user, nil
}

func (r *UserRepository) GetUserByID(id int) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, blocked, email_verified, 
		       email_verification_token, email_verification_token_expires_at,
		       password_reset_token, password_reset_token_expires_at, created_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	var emailVerToken, passResetToken sql.NullString
	var emailVerExpires, passResetExpires sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Blocked, &user.EmailVerified,
		&emailVerToken, &emailVerExpires, &passResetToken, &passResetExpires, &user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if emailVerToken.Valid {
		token := emailVerToken.String
		user.EmailVerificationToken = &token
	}
	if emailVerExpires.Valid {
		user.EmailVerificationTokenExpiresAt = &emailVerExpires.Time
	}
	if passResetToken.Valid {
		token := passResetToken.String
		user.PasswordResetToken = &token
	}
	if passResetExpires.Valid {
		user.PasswordResetTokenExpiresAt = &passResetExpires.Time
	}

	return &user, nil
}

func (r *UserRepository) GetAllUsers() ([]models.User, error) {
	query := `
		SELECT id, email, role, blocked, created_at
		FROM users
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Email, &user.Role, &user.Blocked, &user.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (r *UserRepository) UpdateUserRole(id int, role string) error {
	query := `UPDATE users SET role = $1 WHERE id = $2`
	_, err := r.db.Exec(query, role, id)
	return err
}

func (r *UserRepository) UpdateUserBlocked(id int, blocked bool) error {
	query := `UPDATE users SET blocked = $1 WHERE id = $2`
	_, err := r.db.Exec(query, blocked, id)
	return err
}

// Email verification methods
func (r *UserRepository) SetEmailVerificationToken(userID int, token string, expiresAt time.Time) error {
	query := `UPDATE users SET email_verification_token = $1, email_verification_token_expires_at = $2 WHERE id = $3`
	_, err := r.db.Exec(query, token, expiresAt, userID)
	return err
}

func (r *UserRepository) VerifyEmail(token string) error {
	query := `
		UPDATE users 
		SET email_verified = true, 
		    email_verification_token = NULL, 
		    email_verification_token_expires_at = NULL
		WHERE email_verification_token = $1 
		  AND email_verification_token_expires_at > NOW()
	`
	result, err := r.db.Exec(query, token)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *UserRepository) GetUserByVerificationToken(token string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, blocked, email_verified, 
		       email_verification_token, email_verification_token_expires_at,
		       password_reset_token, password_reset_token_expires_at, created_at
		FROM users
		WHERE email_verification_token = $1
	`
	return r.scanUserWithTokens(query, token)
}

// Password reset methods
func (r *UserRepository) SetPasswordResetToken(userID int, token string, expiresAt time.Time) error {
	query := `UPDATE users SET password_reset_token = $1, password_reset_token_expires_at = $2 WHERE id = $3`
	_, err := r.db.Exec(query, token, expiresAt, userID)
	return err
}

func (r *UserRepository) GetUserByPasswordResetToken(token string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, blocked, email_verified, 
		       email_verification_token, email_verification_token_expires_at,
		       password_reset_token, password_reset_token_expires_at, created_at
		FROM users
		WHERE password_reset_token = $1
	`
	return r.scanUserWithTokens(query, token)
}

func (r *UserRepository) UpdatePassword(userID int, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $1, 
		    password_reset_token = NULL, 
		    password_reset_token_expires_at = NULL
		WHERE id = $2
	`
	_, err := r.db.Exec(query, passwordHash, userID)
	return err
}

// Helper method to scan user with token fields
func (r *UserRepository) scanUserWithTokens(query string, args ...interface{}) (*models.User, error) {
	var user models.User
	var emailVerToken, passResetToken sql.NullString
	var emailVerExpires, passResetExpires sql.NullTime

	err := r.db.QueryRow(query, args...).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Blocked, &user.EmailVerified,
		&emailVerToken, &emailVerExpires, &passResetToken, &passResetExpires, &user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if emailVerToken.Valid {
		token := emailVerToken.String
		user.EmailVerificationToken = &token
	}
	if emailVerExpires.Valid {
		user.EmailVerificationTokenExpiresAt = &emailVerExpires.Time
	}
	if passResetToken.Valid {
		token := passResetToken.String
		user.PasswordResetToken = &token
	}
	if passResetExpires.Valid {
		user.PasswordResetTokenExpiresAt = &passResetExpires.Time
	}

	return &user, nil
}
