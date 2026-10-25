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
        const errorResponse =
          typeof error?.getResponse === 'function' ? error.getResponse() : null;
        const details = errorResponse
          ? typeof errorResponse === 'object'
            ? JSON.stringify(errorResponse)
            : errorResponse
          : error?.message || error;

        this.logger.error(
          `Error occurred in [${method}] ${url}: ${details}`,
          error?.stack,
        );
        return throwError(() => error);
      }),
    );
  }
}
