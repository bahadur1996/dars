package bd.dhaka.dars.entity;

public enum CaseStatus {
    OPEN, UNDER_INVESTIGATION, CLOSED, DISMISSED;

    public boolean isFinal() {
        return this == CLOSED || this == DISMISSED;
    }
}
