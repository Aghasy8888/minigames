import '../styles/globals.scss';
import { createAuthDialog } from '../components/auth-dialog';
import { createFooter } from '../components/footer/footer';
import { createHeader } from '../components/header';
import { startRouter } from './router';

function bootstrap(): void {
  const app = document.createElement('div');
  app.id = 'app';
  document.body.append(app);

  const main = document.createElement('main');
  app.replaceChildren(createHeader(), main, createFooter(), createAuthDialog());
  startRouter(main);
}

bootstrap();
