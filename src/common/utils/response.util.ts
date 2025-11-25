export class ResponseUtil {
  static success(data: any, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
    };
  }

  static pagination(
    data: any[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
