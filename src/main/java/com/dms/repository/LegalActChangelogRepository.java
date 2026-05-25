package com.dms.repository;

import com.dms.entity.LegalActChangelog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LegalActChangelogRepository extends JpaRepository<LegalActChangelog, Long> {

    List<LegalActChangelog> findByLegalActIdOrderByCreatedAtDesc(Long legalActId);
}
