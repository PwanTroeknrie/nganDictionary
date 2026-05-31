/**
 * Convert a word (lemma) to a URL-safe Base64 slug.
 * Mirrors Python backend: base64.urlsafe_b64encode(word.encode('utf-8')).decode('ascii').rstrip('=')
 */
export function wordToSlug(word) {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(word);
  let binaryString = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binaryString += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binaryString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
