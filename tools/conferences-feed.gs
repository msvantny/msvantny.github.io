// Paste into Extensions > Apps Script in the Conferences spreadsheet.
// Only rows marked Publish = Yes and the explicit fields below are public.
const CONFERENCE_SHEET_ID = '1tsG3XL3NPgwuEdhznS-cOouAx7jsN0WJYTygmGi9bD4';
const CONFERENCE_GALLERY_ID = '13ZDw6oZO7JPX235TQAQ8JUXqLiAMkQtg';

function doGet(e) {
  const book = SpreadsheetApp.openById(CONFERENCE_SHEET_ID);
  const folder = DriveApp.getFolderById(CONFERENCE_GALLERY_ID);
  const photos = {};
  const read = name => {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('Missing sheet: ' + name);
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values.shift();
    const col = name => {
      const index = headers.indexOf(name);
      if (index < 0) throw new Error('Missing column: ' + name);
      return index;
    };
    const publish = col('Publish');
    return values.filter(row => String(row[publish]).trim().toLowerCase() === 'yes' && row[col('Event')]).map(row => {
      const get = field => row[col(field)].trim();
      const publicPhotos = get('Photos').split(';').map(s => s.trim()).filter(Boolean).slice(0,4).map(filename => {
        if (!(filename in photos)) {
          const matches = folder.getFilesByName(filename);
          let src = '';
          if (matches.hasNext()) {
            const file = matches.next();
            const thumbnail = file.getThumbnail();
            if (thumbnail && /image\/(jpeg|png|webp)/.test(thumbnail.getContentType())) src = 'data:' + thumbnail.getContentType() + ';base64,' + Utilities.base64Encode(thumbnail.getBytes());
          }
          photos[filename] = src;
        }
        return photos[filename] ? {src:photos[filename]} : null;
      }).filter(Boolean);
      // ID is optional and never controls display order. Private notes and citations
      // are deliberately not read into the public response.
      return {event:get('Event'), year:get('Year'), dates:get('Dates'), location:get('Location'), role:get('Role'), attendance:get('Attendance'), title:get('Contribution title'), authors:get('Authors'), url:get('Link'), description:get('Description'), photos:publicPhotos};
    });
  };
  const result = {organized:read('Organized'), participation:read('Participation')};
  const callback = e && e.parameter && e.parameter.callback;
  const json = JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  if (callback && /^conferenceFeed_[a-z0-9]+$/.test(callback)) return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
