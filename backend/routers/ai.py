from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import schemas
from services.intent_parser import parse_and_answer

router = APIRouter()

@router.post("/query", response_model=schemas.AIQueryResponse)
def ai_query(req: schemas.AIQueryRequest, db: Session = Depends(get_db)):
    answer = parse_and_answer(db, req.query, req.email)
    return {"answer": answer}
