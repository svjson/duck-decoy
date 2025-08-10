import axios, { AxiosInstance } from 'axios'

import { DecoyServer } from 'duck-decoy'

export const makeTestClient = async (
  config: DecoyServer<any> | Object = {}
): Promise<TestHttpClient> => {
  if (config instanceof DecoyServer) {
    return axios.create({
      baseURL: config.url + config.root,
      validateStatus: () => true,
    })
  }

  return axios
}

export type TestHttpClient = AxiosInstance
