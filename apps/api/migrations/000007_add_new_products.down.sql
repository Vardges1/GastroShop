-- Remove products added in this migration
-- Note: This removes products by slug, which should be safe
DELETE FROM products 
WHERE slug IN (
    '1001-noch', '1001-noch-lysoy', 'bavaria-blue', 'basiron-blue',
    'basiron-dikiy-chesnok', 'basiron-zatara', 'basiron-krasnoe-pesto',
    'basiron-perets-luk', 'basiron-pivo', 'basiron-trikolor',
    'basiron-tryufel', 'basiron-chernyy-limon', 'batistella-brilliant',
    'batistella-seno', 'batistella-shampanskoe', 'bebibel-120g',
    'bebibel-fiolet-120g', 'belgrano-koziy', 'bri-125gr',
    'bri-petit-france-1kg', 'velkhuzien-med', 'velkhuzien-siniy',
    'velkhuzien-ho', 'velkhuzien-cherniy-old', 'vino-abriagoni',
    'gorgonzola-leonardi', 'goshe', 'gran-albiero-kus',
    'gran-muraviya', 'grana-padana-cantarele', 'grana-padano-kuskovoy',
    'grana-podana-gol', 'grandano-pradera', 'grandano-pradera-matur',
    'grudka-indeyki-gril-elpazo', 'gruver', 'guanchela-podushka',
    'gudbrand-krasniy-1kg', 'dzhersi-chernyy', 'dorblu-zelenyy',
    'dorblu-zelenyy-original', 'dorblu-chernyy-original', 'il-pikkolo',
    'ilchestr-klyukva', 'ilchestr-meksikano', 'ilchestr-shokolad-apelsin',
    'irlandskiy-chedder-shalfey-150g', 'kambazola-klassik',
    'castello-ananas-125gr', 'castello-ananas-1kg', 'kinara-tryufel-200g',
    'kinara-tryufel-gol', 'koziy-friko'
);
