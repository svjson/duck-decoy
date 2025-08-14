import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

import { DecoyServer } from 'duck-decoy'

export interface TestHttpClient {
  get<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>

  delete<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>

  post<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>

  put<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>

  patch<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
}

export const makeTestClient = async (
  config: DecoyServer<any> | Object = {}
): Promise<TestHttpClient> => {
  const client =
    config instanceof DecoyServer
      ? axios.create({
          baseURL: config.url + config.root,
          validateStatus: () => true,
        })
      : axios

  const withJsonHeader = <D>(cfg?: AxiosRequestConfig<D>): AxiosRequestConfig<D> => ({
    ...cfg,
    headers: { 'Content-Type': 'application/json', ...(cfg?.headers ?? {}) },
  })

  const api: TestHttpClient = {
    get<T = any, R = AxiosResponse<T>, D = any>(
      url: string,
      cfg?: AxiosRequestConfig<D>
    ): Promise<R> {
      return client.get<T, R, D>(url, cfg)
    },
    delete<T = any, R = AxiosResponse<T>, D = any>(
      url: string,
      cfg?: AxiosRequestConfig<D>
    ): Promise<R> {
      return client.delete<T, R, D>(url, cfg)
    },
    post<T = any, R = AxiosResponse<T>, D = any>(
      url: string,
      data?: D,
      cfg?: AxiosRequestConfig<D>
    ): Promise<R> {
      return client.post<T, R, D>(url, data, withJsonHeader(cfg))
    },
    put<T = any, R = AxiosResponse<T>, D = any>(
      url: string,
      data?: D,
      cfg?: AxiosRequestConfig<D>
    ): Promise<R> {
      return client.put<T, R, D>(url, data, withJsonHeader(cfg))
    },
    patch<T = any, R = AxiosResponse<T>, D = any>(
      url: string,
      data?: D,
      cfg?: AxiosRequestConfig<D>
    ): Promise<R> {
      return client.patch<T, R, D>(url, data, withJsonHeader(cfg))
    },
  }

  return api
}
