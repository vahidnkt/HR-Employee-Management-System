import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';
import { RESPONSE_MESSAGES } from '../constants/response.constants';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;
        let message = RESPONSE_MESSAGES.GET;

        switch (method) {
          case 'GET':
            message = RESPONSE_MESSAGES.GET;
            break;
          case 'POST':
            message = RESPONSE_MESSAGES.POST;
            break;
          case 'PUT':
            message = RESPONSE_MESSAGES.PUT;
            break;
          case 'PATCH':
            message = RESPONSE_MESSAGES.PATCH;
            break;
          case 'DELETE':
            message = RESPONSE_MESSAGES.DELETE;
            break;
          default:
            message = 'Success';
        }

        // Handle pagination for GET requests
        if (method === 'GET' && data && typeof data === 'object') {
          const responseData: any = {
            statusCode,
            message,
          };

          // Check if data has pagination structure (items/data array with metadata)
          if (Array.isArray(data)) {
            // Simple array response
            responseData.data = data;
            responseData.total = data.length;
            responseData.activeItems = data.length;
          } else if (data.items || data.data) {
            // Paginated response with items/data property
            const items = data.items || data.data || [];
            responseData.data = items;
            responseData.total = data.total || data.count || items.length;
            responseData.page = data.page || data.currentPage || 1;
            responseData.take =
              data.take || data.limit || data.pageSize || items.length;
            responseData.activeItems = items.length;
          } else if (data.total !== undefined || data.count !== undefined) {
            // Pagination metadata exists
            responseData.data = data.data || data.items || data;
            responseData.total = data.total || data.count || 0;
            responseData.page = data.page || data.currentPage || 1;
            responseData.take = data.take || data.limit || data.pageSize || 0;
            responseData.activeItems = Array.isArray(responseData.data)
              ? responseData.data.length
              : 1;
          } else {
            // Regular object response
            responseData.data = data;
          }

          return responseData;
        }

        // For non-GET requests or non-paginated responses
        return {
          statusCode,
          message,
          data: data || null,
        };
      }),
    );
  }
}
