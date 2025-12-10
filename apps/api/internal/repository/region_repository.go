package repository

import (
	"database/sql"

	"gastroshop-api/internal/models"
)

type RegionRepository struct {
	db *sql.DB
}

func NewRegionRepository(db *sql.DB) *RegionRepository {
	return &RegionRepository{db: db}
}

func (r *RegionRepository) GetRegions() ([]models.Region, error) {
	query := `
		SELECT code, name, geojson_feature
		FROM regions
		ORDER BY name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var regions []models.Region
	for rows.Next() {
		var region models.Region
		err := rows.Scan(&region.Code, &region.Name, &region.GeoJSONFeature)
		if err != nil {
			return nil, err
		}
		regions = append(regions, region)
	}

	return regions, nil
}

func (r *RegionRepository) GetRegionByCode(code string) (*models.Region, error) {
	query := `
		SELECT code, name, geojson_feature
		FROM regions
		WHERE code = $1
	`

	var region models.Region
	err := r.db.QueryRow(query, code).Scan(&region.Code, &region.Name, &region.GeoJSONFeature)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &region, nil
}
