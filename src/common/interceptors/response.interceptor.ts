import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS } from '../message.js';

export interface ResponseFormat<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseFormat<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();
    const startTime = performance.now();

    return next.handle().pipe(
      map((resData) => {
        const duration = Math.round((performance.now() - startTime) * 100) / 100;
        if (response && typeof response.setHeader === 'function') {
          response.setHeader('X-Response-Time', `${duration}ms`);
          response.setHeader('Server-Timing', `total;dur=${duration}`);
        }

        const statusCode = response.statusCode;
        let message = SUCCESS;
        let data = resData;

        if (resData && typeof resData === 'object') {
          if ('message' in resData && typeof resData.message === 'string') {
            message = resData.message;
            const { message: _, ...rest } = resData;
            data =
              Object.keys(rest).length === 1 && 'data' in rest
                ? rest.data
                : rest;
          }
        }

        return {
          success: true,
          statusCode,
          message,
          data: data ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
