import '../styles/globals.scss';
import './app.scss';
import { createAuthDialog } from '../components/auth-dialog';
import { createFooter } from '../components/footer';
import { createHeader } from '../components/header';
import { startRouter } from './router';

function bootstrap(): void {
  const app = document.createElement('div');
  app.id = 'app';
  app.className = 'app';
  document.body.append(app);

  const main = document.createElement('main');
  main.className = 'app__main';
  app.replaceChildren(createHeader(), main, createFooter(), createAuthDialog());
  startRouter(main);
}

bootstrap();
