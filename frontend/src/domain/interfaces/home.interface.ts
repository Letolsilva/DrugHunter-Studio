// domain/interfaces/home.interface.ts
import type { HomeStatusModel } from "../models/home.model";

export abstract class IHomeUseCase {
  abstract getStatus(token: string): Promise<HomeStatusModel>;
}
