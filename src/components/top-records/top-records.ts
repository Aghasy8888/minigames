import { cupImage } from '../../assets/images';
import type { GameDetailsTopRecord } from '../../mocks/game-details';
import { MOCK_REFERENCE_DATE } from '../../mocks/mock-reference-date';
import { formatRelativeTime } from '../../utils/format-relative-time';
import { formatScore } from '../../utils/format-score';
import { MEDAL_IMAGES, POINTS_SUFFIX, TOP_RECORDS_TITLE } from './top-records-data';
import './top-records.scss';

const TITLE_ID = 'top-records-title';

function createDecorativeImage(source: string, className: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = source;
  image.alt = '';
  image.className = className;
  image.setAttribute('aria-hidden', 'true');
  return image;
}

function createRecordRow(record: GameDetailsTopRecord): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'top-records__row';

  const player = document.createElement('span');
  player.className = 'top-records__player';

  const medalSource = MEDAL_IMAGES[record.position];
  if (medalSource) {
    player.append(createDecorativeImage(medalSource, 'top-records__medal'));
  }

  const name = document.createElement('span');
  name.className = 'top-records__name';
  name.textContent = record.playerName;
  player.append(name);

  const result = document.createElement('span');
  result.className = 'top-records__result';

  const score = document.createElement('span');
  score.className = 'top-records__score';
  score.textContent = `${formatScore(record.score)} ${POINTS_SUFFIX}`;

  const time = document.createElement('time');
  time.className = 'top-records__time';
  time.dateTime = record.achievedAt;
  time.textContent = formatRelativeTime(record.achievedAt, MOCK_REFERENCE_DATE);

  result.append(score, time);
  row.append(player, result);
  return row;
}

export function createTopRecords(records: GameDetailsTopRecord[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'top-records';
  section.setAttribute('aria-labelledby', TITLE_ID);

  const title = document.createElement('h3');
  title.id = TITLE_ID;
  title.className = 'top-records__title';

  const titleText = document.createElement('span');
  titleText.textContent = TOP_RECORDS_TITLE;
  title.append(createDecorativeImage(cupImage, 'top-records__title-icon'), titleText);

  const list = document.createElement('ol');
  list.className = 'top-records__list';
  list.append(...records.map((record) => createRecordRow(record)));

  section.append(title, list);
  return section;
}
