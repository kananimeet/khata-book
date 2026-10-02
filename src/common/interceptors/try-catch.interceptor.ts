import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TryCatchInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TryCatchInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const req = context.switchToHttp().getRequest();
        const method = req?.method || 'METHOD';
        const url = req?.url || 'URL';
        this.logger.error(
          `Error occurred in [${method}] ${url}: ${error?.message || error}`,
          error?.stack,
        );
        return throwError(() => error);
      }),
    );
  }
}
