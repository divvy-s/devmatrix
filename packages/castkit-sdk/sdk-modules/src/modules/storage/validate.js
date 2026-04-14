export class MissingMetadataFieldError extends Error {
  constructor(fields) {
    const missingFields = Array.isArray(fields) ? fields : [fields];
    super(`Missing required metadata field(s): ${missingFields.join(', ')}`);
    this.name = 'MissingMetadataFieldError';
    this.fields = missingFields;
  }
}

export function validateMetadata(metadata, options = {}) {
  const strict = options.strict === true;
  const missingFields = [];

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Metadata payload must be a JSON object.');
  }

  if (!metadata.name) {
    missingFields.push('name');
  }

  if (!metadata.image) {
    missingFields.push('image');
  }

  if (strict && missingFields.length > 0) {
    throw new MissingMetadataFieldError(missingFields);
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}
