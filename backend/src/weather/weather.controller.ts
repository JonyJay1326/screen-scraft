import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

/** 内置天气 */
@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  /** GET /weather?adcode= */
  @Get()
  query(@Query('adcode') adcode: string) {
    return this.weather.query(adcode);
  }
}
