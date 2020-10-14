from PIL import Image 
import pathlib

screenshots = pathlib.Path('assets/play_store').glob('*.jpg')

for screenshot in screenshots:
  print(screenshot)

  path_string = str(screenshot).lower()

  if 'screenshot' not in path_string:
    continue

  if 'crop' in path_string:
    continue

  im = Image.open(screenshot)

  # 1080 * 2400 -> 1080 * 2322
  # Subtract 88 pixels from the top.
  left = 0
  top = 88
  right = 1080
  bottom = 2400
    
  im_cropped = im.crop((left, top, right, bottom))

  save_path = screenshot.parent / ('cropped_' + screenshot.name)
  im_cropped.save(save_path)
