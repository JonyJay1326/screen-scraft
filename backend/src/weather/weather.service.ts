import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TencentWeatherData } from '@screencraft/shared';
import { BizException } from '../common/biz.exception';

/** 腾讯天气代理，key 只留后端 */
@Injectable()
export class WeatherService {
  constructor(private readonly config: ConfigService) {}

  /** 按 adcode 取实时天气；无 key 时返回演示数据便于本地验收 */
  async query(adcode: string): Promise<TencentWeatherData> {
    const code = adcode?.trim();
    if (!code) {
      throw BizException.validation('请提供 adcode');
    }
    const key = this.config.get<string>('WEATHER_KEY');
    if (!key) {
      return demoWeather(code);
    }
    try {
      const result = await axios.get('https://apis.map.qq.com/ws/weather/v1/', {
        params: { key, adcode: code, type: 'now', added_fields: 'air' },
        timeout: 10000,
      });
      return result.data as TencentWeatherData;
    } catch (error) {
      throw BizException.proxyFail((error as Error).message || '天气代理失败');
    }
  }
}

/** 无 key 时的演示天气 */
function demoWeather(adcode: string): TencentWeatherData {
  return {
    status: 0,
    message: 'ok',
    result: {
      realtime: [
        {
          province: '浙江省',
          city: '杭州市',
          district: '滨江区',
          adcode: Number(adcode) || 330108,
          update_time: new Date().toISOString().slice(0, 16).replace('T', ' '),
          infos: {
            weather: '多云',
            temperature: 29,
            wind_direction: '东风',
            wind_power: '2级',
            humidity: 62,
            air_pressure: 1008,
          },
          air: { aqi: 42, pm10: 28, pm25: 18, no2: 12, o3: 40, so2: 4, co: 0.5 },
        },
      ],
    },
  };
}
