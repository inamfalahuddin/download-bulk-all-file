SELECT 
  GROUP_CONCAT(
    CONCAT('"', real_path, filename_new, '"')
    SEPARATOR ', '
  ) AS file_urls
FROM t_formulir_file
WHERE pelayanan_id = '12247';

SELECT CONCAT(real_path, filename_new) FROM t_formulir_file WHERE pelayanan_id = '12247' ORDER BY created_at ASC;