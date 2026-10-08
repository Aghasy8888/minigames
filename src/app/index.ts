import '../styles/globals.scss';
import './app.scss';
import { createAuthDialog } from '../components/auth-dialog';
import { createFooter } from '../components/footer';
import { createGameDetailsDialog } from '../components/game-details-dialog';
import { createHeader } from '../components/header';
import { createSnackbarHost } from '../components/snackbar';
import { initFirebaseAuth } from '../services/firebase-auth';
import { showSnackbar } from '../store/snackbar-store';
import { startRouter } from './router';

function startFirebaseAuth(): void {
  try {
    initFirebaseAuth();
  } catch {
    showSnackbar({ variant: 'error', message: 'Sign-in is unavailable right now.' });
  }
}

function bootstrap(): void {
  const app = document.createElement('div');
  app.id = 'app';
  app.className = 'app';
  document.body.append(app);

  const main = document.createElement('main');
  main.className = 'app__main';
  app.replaceChildren(
    createHeader(),
    main,
    createFooter(),
    createAuthDialog(),
    createGameDetailsDialog(),
    createSnackbarHost(),
  );
  startFirebaseAuth();
  startRouter(main);
}

bootstrap();
